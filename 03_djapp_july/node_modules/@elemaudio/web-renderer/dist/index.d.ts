import * as _elemaudio_core from '@elemaudio/core';
import { EventEmitter } from '@elemaudio/core';

declare class WebRenderer extends EventEmitter {
    private _worklet;
    private _promiseMap;
    private _nextRequestId;
    private _renderer;
    private _timer;
    context: AudioContext;
    initialize(audioContext: AudioContext, workletOptions?: AudioWorkletNodeOptions, eventInterval?: number): Promise<AudioWorkletNode>;
    _sendWorkletRequest(requestType: any, payload: any): Promise<unknown>;
    createRef(kind: any, props: any, children: any): (_elemaudio_core.NodeRepr_t | ((newProps: any) => Promise<any>))[];
    render(...args: any[]): Promise<{
        nodesAdded: number;
        edgesAdded: number;
        propsWritten: number;
        elapsedTimeMs: number;
    }>;
    updateVirtualFileSystem(vfs: any): Promise<unknown>;
    pruneVirtualFileSystem(): Promise<unknown>;
    listVirtualFileSystem(): Promise<unknown>;
    reset(): Promise<unknown>;
    gc(): Promise<unknown>;
    setCurrentTime(t: any): Promise<unknown>;
    setCurrentTimeMs(t: any): Promise<unknown>;
}

export { WebRenderer as default };
