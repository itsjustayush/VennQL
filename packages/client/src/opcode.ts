export enum OpCode {
  Query = 0x01,
  Mutate = 0x02,
  Stream = 0x03,
  Ping = 0x04,
  Pong = 0x05,
  Ack = 0x06,
  Cancel = 0xfe,
  Error = 0xff,
}

export const Flags = {
  COMPRESSED: 0x01,
  STREAM_END: 0x02,
  CACHEABLE: 0x04,
  AUTH_SET: 0x08,
} as const;
