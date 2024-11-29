interface WaveformProps {
  data: number[];
}

export function Waveform({ data }: WaveformProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  return (
    <div className="w-full h-24 bg-muted flex items-center">
      {data.map((value, index) => (
        <div
          key={index}
          className="w-1 bg-primary"
          style={{
            height: `${((value - min) / range) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
