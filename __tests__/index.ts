import { PostBridge } from '../src/index';

describe('App', () => {
  test('PostBridge.messageType toBeDefined', async () => {
    expect(PostBridge.messageType).toBeDefined();
  });

  test('postBridge.messageId toBeDefined', async () => {
    const postBridge = new PostBridge(window);
    expect(postBridge.messageId).toBeDefined();
  });
});
