import { fork, ChildProcess } from 'child_process';
import { fromEvent } from 'rxjs';
import { CoreBidging, CoreBidgingSubject, CoreBidgingOption, CoreBidgingEvent } from './core-bidging';
export interface ForkChildProcessOption extends CoreBidgingOption {
    file: string;
}
class ForkChildProcessBidging extends CoreBidging<ForkChildProcessOption> {
    _fork: ChildProcess;
    constructor(option: ForkChildProcessOption) {
        super(option);
    }

    close(res?: any) {
        this._fork.kill(res);
        this.closed = true;
    }

    send(msg: any) {
        this._fork.send(msg)
    }

    create(next: any, error: (err: Error) => void, complete: any) {
        try {
            this._fork = fork(this.option.file);
            // 接受消息
            fromEvent(this._fork, 'message').subscribe((res: any) => {
                if (Array.isArray(res)) {
                    res = res[0];
                }
                if (res.action) {
                    next(res)
                } else {
                    next(new CoreBidgingEvent('message', res))
                }
            });
        } catch (e) {
            error(e);
            return;
        }
    }
}

export class ForkChildProcessSubject<T extends CoreBidgingEvent> extends CoreBidgingSubject<T, ForkChildProcessOption> {
    constructor(
        option: ForkChildProcessOption
    ) {
        super(option);
        this.config.bidging = ForkChildProcessBidging;
    }
}
