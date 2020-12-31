import { WebClient } from "@slack/web-api";

export default class Client {
  constructor(token) {
    this.slack = new WebClient(token);
  }

  async getChannel(channelName) {
    const { channels } = await this.slack.conversations.list({
      types: "public_channel,private_channel",
      limit: 1000, // TODO: Cursor support
    });
    const [channel] = channels.filter((c) => c.name === channelName);
    return channel;
  }

  async postMessage() {
    return this.slack.chat.postMessage(...arguments);
  }

  async update() {
    return this.slack.chat.update(...arguments);
  }
}
