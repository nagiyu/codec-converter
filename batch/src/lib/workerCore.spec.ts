import { EventEmitter } from 'events';
import { runFfmpeg, updateJobStatus } from './workerCore';

describe('workerCore', () => {
  test('runFfmpeg parses duration and reports progress then resolves on close', async () => {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();

    const mockChild: any = new EventEmitter();
    mockChild.stdout = stdout;
    mockChild.stderr = stderr;
    mockChild.on = (ev: string, cb: (...args: any[]) => void) => {
      // allow listeners for 'close' and 'error' on the child itself
      EventEmitter.prototype.on.call(mockChild, ev, cb);
      return mockChild;
    };

    const spawnFn = jest.fn(() => mockChild);

    const progress = jest.fn();

    const promise = runFfmpeg('in.mp4', 'out.mp4', 'h264', spawnFn, progress);

    // emit duration on stderr, then a progress update on stdout, then close
    stderr.emit('data', Buffer.from('Duration: 00:00:10'));
    stdout.emit('data', Buffer.from('out_time_ms=5000000\n'));
    stdout.emit('data', Buffer.from('out_time_ms=10000000\n'));
    mockChild.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(progress).toHaveBeenCalledWith(50);
    expect(progress).toHaveBeenCalledWith(100);
  });

  test('updateJobStatus constructs and sends UpdateCommand', async () => {
    const sent: any[] = [];
    const mockDocClient: any = {
      send: jest.fn(async (cmd: any) => {
        sent.push(cmd);
        return {};
      }),
    };

    await updateJobStatus(mockDocClient, 'my-table', 'job-123', 'running', { progress_percent: 0 });

    expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    const cmd = sent[0];
    // AWS SDK command exposes .input with parameters
    expect(cmd.input.TableName).toBe('my-table');
    expect(cmd.input.Key.id).toBe('job-123');
    expect(cmd.input.UpdateExpression).toContain('#status = :status');
  });
});
