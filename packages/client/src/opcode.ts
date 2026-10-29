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
  NONE: 0x00,
  COMPRESSED: 0x01,
  STREAM_END: 0x02,
  CACHEABLE: 0x04,
  AUTH_SET: 0x08,
  RESERVED_MASK: 0xf0,
} as const;

export const MAX_PAYLOAD_SIZE = 16 * 1024 * 1024; // 16 MB limit
