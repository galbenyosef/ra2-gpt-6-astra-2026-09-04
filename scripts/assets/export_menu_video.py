"""Extract the original menu Bink; native FFmpeg or the browser worker encodes WebM."""
import os
import subprocess
import export_assets as e


def export_menu_video():
    source = e.ROOT / 'raw/ra2ts_l.bik'
    data = source.read_bytes() if source.exists() else e.find('ra2ts_l.bik')
    if not data:
        raise RuntimeError('Missing original menu video: ra2ts_l.bik')
    raw = e.OUT / 'ui/ra2ts_l.bik'
    raw.write_bytes(data)
    if not e.browser_runtime:
        try:
            subprocess.run([os.environ.get('RA2_FFMPEG', 'ffmpeg'), '-hide_banner',
                            '-loglevel', 'error', '-y', '-i', str(raw), '-c:v', 'libvpx',
                            '-crf', '10', '-b:v', '2M', '-deadline', 'realtime',
                            '-cpu-used', '2', '-an', str(raw.with_suffix('.webm'))], check=True)
        finally:
            raw.unlink(missing_ok=True)
    e.manifest['menuVideo'] = {'src': '/assets/ui/ra2ts_l.webm', 'width': 632,
                               'height': 570, 'originalFile': 'ra2ts_l.bik'}
