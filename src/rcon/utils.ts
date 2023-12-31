export const encode = (type: number, id: number, body: string) => {
  const size = Buffer.byteLength(body) + 14;
  const buf = Buffer.alloc(size);

  buf.writeInt32LE(size - 4, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  buf.write(body, 12, size - 2, 'utf-8');
  buf.writeInt16LE(0, size - 2);

  return buf;
};
