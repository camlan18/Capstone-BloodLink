import { Writable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '../cloudinary.service';
jest.mock('cloudinary', () => ({ v2: { uploader: { upload_stream: jest.fn() } } }));

describe('CLOUD-001 CloudinaryService.uploadFile', () => {
  let service: CloudinaryService;
  let chunks: Buffer[];
  const upload = cloudinary.uploader.upload_stream as unknown as jest.Mock;
  // Fake upload stream: calls the callback with (error, result) once the piped data has ended.
  const stream = (error: any, result: any) =>
    upload.mockImplementation((cb: any) =>
      new Writable({
        write(chunk, _enc, next) { chunks.push(chunk); next(); },
        final(done) { cb(error, result); done(); },
      }));
  beforeEach(() => {
    chunks = [];
    upload.mockReset();
    service = new CloudinaryService();
  });

  it('UTCID01 resolves secure_url and pipes buffer', async () => {
    const result = { secure_url: 'https://res/x.png' };
    stream(null, result);
    await expect(service.uploadFile({ buffer: Buffer.from('img') } as any)).resolves.toEqual(result);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(Buffer.concat(chunks).toString()).toBe('img');
  });

  it('UTCID02 empty buffer', async () => {
    const result = { secure_url: 'https://res/empty.png' };
    stream(null, result);
    await expect(service.uploadFile({ buffer: Buffer.alloc(0) } as any)).resolves.toBe(result);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('UTCID03 cloudinary error rejected as-is', async () => {
    const err = { message: 'Invalid image' };
    stream(err, undefined);
    await expect(service.uploadFile({ buffer: Buffer.from('img') } as any)).rejects.toBe(err);
  });

  it('UTCID04 undefined buffer -> TypeError', async () => {
    stream(null, {});
    await expect(service.uploadFile({ buffer: undefined } as any)).rejects.toMatchObject({ name: 'TypeError' });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(chunks).toHaveLength(0);
  });
});
