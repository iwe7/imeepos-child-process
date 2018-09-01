## subscribe监听时自动创建fork进程，next时发送指令给child-process,unsubscribe自动kill

```ts
import { ForkChildProcessSubject } from 'imeepos-child-process';
const fork = new ForkChildProcessSubject({
    file: "./forks/test"
});
fork.pipe().subscribe(
    res => {
        console.log('recive', res.action);
        if (res.action === 'finish') {
            fork.unsubscribe();
        }
    },
    err => console.log(err),
    () => console.log('complete')
);
```
## next 发送消息给主进程，unsubscribe调用process.exit,subscribe监听message事件
- forks/test
```ts
import { tap, map } from 'rxjs/operators';
import { CoreBidgingEvent, ProcessSubject } from 'imeepos-child-process';
const proc = new ProcessSubject<CoreBidgingEvent>({});
proc.pipe(
    tap(res => {
        if (res.action === 'start') {
            for (let i = 0; i < 1000000000; i++) {

            }
            proc.next({
                action: "finish",
                payload: {}
            })
        }
    })
).subscribe();
```
