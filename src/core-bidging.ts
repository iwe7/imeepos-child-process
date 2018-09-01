import { AnonymousSubject } from 'rxjs/internal/Subject';
import {
    Observer, Subject, ReplaySubject,
    Subscriber, Subscription
} from 'rxjs';
import { EventEmitter } from 'events';
import { tryCatch } from 'rxjs/util/tryCatch';
import { errorObject } from 'rxjs/util/errorObject';

export class CoreBidgingEvent<T = any> {
    constructor(public action: string, public payload: T) { }
}

export interface CoreBidgingOption<T = any> {
    serializer?: (value: T) => CoreBidgingEvent;
    deserializer?: (e: CoreBidgingEvent) => T;
    bidging?: new (option: any) => CoreBidging;
}

export abstract class CoreBidging<O = any, T extends CoreBidgingOption = any> extends EventEmitter {
    closed: boolean = false;
    option: T;
    constructor(option: T) {
        super();
        this.option = option;
    }
    abstract close(msg?: O): void;
    abstract create(next: (value: O) => void, error: (err: Error) => void, complete: () => void): void;
    abstract send(msg: O, handel?: any): void;
}

export abstract class CoreBidgingSubject<T = any, O extends CoreBidgingOption = any> extends AnonymousSubject<T> {
    _bidging: CoreBidging;
    _output: Subject<T>;
    constructor(
        public config: O,
        destination?: Observer<T>
    ) {
        super();
        this._output = new Subject<T>();
        if (!this.config.serializer) {
            this.config.serializer = (value: T) => value as any
        }
        if (!this.config.deserializer) {
            this.config.deserializer = (value: CoreBidgingEvent) => value as any
        }
        this.destination = destination || new ReplaySubject();
    }

    createBidging(): CoreBidging {
        const bidging = new this.config.bidging(this.config);
        bidging.create((res: CoreBidgingEvent) => {
            const result = tryCatch(this.config.deserializer)(res);
            if (result === errorObject) {
                this._output.error(errorObject.e);
            } else {
                this._output.next(result);
            }
        }, (err: Error) => {
            this._resetState();
            this._output.error(err);
        }, () => {
            this._resetState();
            this._output.complete();
        });
        const subscription = new Subscription(() => {
            this._bidging = null;
            if (bidging && !bidging.closed) {
                bidging.close();
            }
        });
        const queue = this.destination;
        this.destination = Subscriber.create<T>(
            (x) => {
                if (!bidging.closed) {
                    const msg = tryCatch(this.config.serializer)(x);
                    if (msg === errorObject) {
                        this.destination.error(errorObject.e);
                        return;
                    }
                    bidging.send(msg);
                }
            },
            (e) => {
                this._output.error(e);
                this._resetState();
            },
            () => {
                bidging.close();
                this._resetState();
            }
        ) as Subscriber<any>;
        if (queue && queue instanceof ReplaySubject) {
            subscription.add((<ReplaySubject<T>>queue).subscribe(this.destination));
        }
        return bidging;
    }
    _subscribe(subscriber: Subscriber<T>): Subscription {
        const { source } = this;
        if (source) {
            return source.subscribe(subscriber);
        }
        if (!this._bidging) {
            this._bidging = this.createBidging();
        }
        this._output.subscribe(subscriber);
        subscriber.add(() => {
            const { _bidging } = this;
            if (this._output.observers.length === 0) {
                if (_bidging && !_bidging.closed) {
                    _bidging.close();
                }
                this._resetState();
            }
        });
        return subscriber;
    }

    unsubscribe() {
        const { source, _bidging } = this;
        if (_bidging && !_bidging.closed) {
            _bidging.close();
            this._resetState();
        }
        super.unsubscribe();
        if (!source) {
            this.destination = new ReplaySubject();
        }
    }

    _resetState() {
        this._bidging = null;
        if (!this.source) {
            this.destination = new ReplaySubject();
        }
        this._output = new Subject<T>();
    }
}
