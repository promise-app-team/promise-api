import { AsyncEventEmitter } from '@/utils';

describe(AsyncEventEmitter, () => {
  test('should emit returns a value if listeners are synchronous', async () => {
    const emitter = new AsyncEventEmitter<{ foo: [string] }>();
    const fooListener = jest.fn();

    emitter.on('foo', fooListener);

    const result = emitter.emit('foo', 'hello');

    expect(result).toBeTrue();
    expect(fooListener).toHaveBeenCalledWith('hello');
  });

  test('should emit returns a promise if listeners are asynchronous', async () => {
    const emitter = new AsyncEventEmitter<{ foo: [string] }>();
    const fooListener = jest.fn(() => Promise.resolve());

    emitter.on('foo', fooListener);

    const result = emitter.emit('foo', 'hello');

    expect(result).toBeInstanceOf(Promise);
    expect(fooListener).toHaveBeenCalledWith('hello');
  });
});
