export class ChatOutputParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatOutputParseError";
  }
}
