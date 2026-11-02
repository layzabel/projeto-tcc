import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadJson } from '@/platform/download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadJson (R12)', () => {
  it('baixa por Blob + <a download> e revoga a URL', () => {
    const createObjectURL = vi.fn(() => 'blob:teste');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadJson('dados.json', '{"a":1}');
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe('application/json');
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('dados.json');
    expect(anchor.href).toBe('blob:teste');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:teste');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.unstubAllGlobals();
  });
});
