import { fromEvent } from 'rxjs';
import { CoreBidging, CoreBidgingSubject, CoreBidgingOption, CoreBidgingEvent } from './core-bidging';
export class CoreProcess extends CoreBidging {
    close(msg?: any): void {
        process.exit(msg);
    }
    create(next: (value: any) => void, error: (err: Error) => void, complete: () => void): void {
        fromEvent(process, 'exit').subscribe(res => {
            complete();
        });
        fromEvent(process, 'disconnect').subscribe(res => {
            complete();
        });
        fromEvent(process, 'message').subscribe((res: any) => {
            if (Array.isArray(res)) {
                res = res[0];
            }
            if (res.action) {
                next(res)
            } else {
                next(new CoreBidgingEvent('message', res))
            }
        });
    }
    send(msg: any, handel?: any): void {
        if (process.send) {
            process.send(msg, handel);
        } else if (process.emit) {
            process.emit('message', msg, handel)
        }
    }
}

export class ProcessSubject<T extends CoreBidgingEvent> extends CoreBidgingSubject<T> {
    constructor(option: CoreBidgingOption) {
        super(option);
        option.bidging = CoreProcess;
    }
}
