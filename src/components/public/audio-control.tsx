'use client';
import { useRef, useState } from 'react';
import { Music2, Pause } from 'lucide-react';
export function AudioControl() {
  const audio = useRef<HTMLAudioElement>(null),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState('');
  async function toggle() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
    } else {
      try {
        await audio.current?.play();
        setPlaying(true);
      } catch {
        setError('Music could not be played.');
      }
    }
  }
  return (
    <div className="audio-control">
      <audio ref={audio} src="/assets/audio/lesa.mp3" preload="none" loop />
      <button
        type="button"
        aria-pressed={playing}
        aria-label={playing ? 'Pause background music' : 'Play optional background music'}
        onClick={toggle}
      >
        {playing ? <Pause size={15} /> : <Music2 size={15} />}
        <span>{playing ? 'Music on' : 'Set the mood'}</span>
        <span className={`audio-bars ${playing ? 'active' : ''}`}>
          <i />
          <i />
          <i />
        </span>
      </button>
      {error && <span role="status">{error}</span>}
    </div>
  );
}
