## 简介
> 最近做项目，用到nodejs多进程，喜欢rxjs便做了如下封装，基本满足我的需求！
> [源码请戳](https://github.com/iwe7/imeepos-child-process)

## 安装
```
yarn add imeepos-child-process
```

### ForkChildProcessSubject
* subscribe监听时自动创建fork进程
* next时发送指令给child-process
* unsubscribe自动kill

```ts
import { CPForkSubject } from 'imeepos-child-process';
const fork = new CPForkSubject('./forks/test', 1000000);
fork.pipe().subscribe(
    res => {
        console.log(res);
    },
    err => console.log(err),
    () => console.log('complete')
);
```

### ProcessSubject
* next 发送消息给主进程
* unsubscribe调用process.exit
* subscribe监听message事件

- forks/test
```ts
import { tap, map } from 'rxjs/operators';
import { ProcessSubject } from 'imeepos-child-process';
const proc = new ProcessSubject<number>({});
proc.pipe(
    tap((res:number) => {
        let s = 0;
        for (let i = 0; i < res; i++) {
            s += i;
        }
        proc.next(s);
        // 终止
        proc.complete();
    })
).subscribe();
```


封装后可以方便的使用rxjs提供的操作符操作
```ts
import { merge } from 'rxjs';

import { CPForkSubject } from 'imeepos-child-process';
const forks = [];
for (let i = 0; i < 10; i++) {
    forks.push(run('./forks/test', (i + 1) * 100000000));
}

merge(...forks).pipe().subscribe(res => {
    console.log(res);
});

function run(file: string, start: number) {
    const fork = new CPForkSubject(file, start).pipe();
    return fork;
}

```
