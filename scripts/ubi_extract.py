import struct, sys, collections
data = open(sys.argv[1], 'rb').read()
PEB = 131072
vols = collections.defaultdict(dict)
names = {}
for off in range(0, len(data) - PEB + 1, PEB):
    peb = data[off:off+PEB]
    if peb[:4] != b'UBI#':
        continue
    vid_off = struct.unpack('>I', peb[16:20])[0]
    data_off = struct.unpack('>I', peb[20:24])[0]
    vid = peb[vid_off:vid_off+64]
    if vid[:4] != b'UBI!':
        continue
    vol_id, lnum = struct.unpack('>II', vid[8:16])
    vol_type = vid[4]
    dsize = struct.unpack('>I', vid[24:28])[0]
    d = peb[data_off:PEB]
    if vol_type == 2:  # static volume: use data_size
        d = d[:dsize]
    if vol_id == 0x7fffefff:  # layout volume
        rec = peb[data_off:]
        for i in range(128):
            r = rec[i*172:(i+1)*172]
            if not r or r[:4] == b'\0'*4: continue
            n = r[32:32+128].split(b'\0')[0].decode()
            names[i] = n
        continue
    vols[vol_id][lnum] = d
for vid_, lebs in vols.items():
    out = b''.join(lebs[k] for k in sorted(lebs))
    name = names.get(vid_, str(vid_))
    fn = f"{sys.argv[2]}/vol_{vid_}_{name}.bin"
    open(fn, 'wb').write(out)
    print(fn, len(out), out[:4])
