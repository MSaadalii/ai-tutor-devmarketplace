import { Button } from "@/components/ui/button";

export function BoardToolbar({
  onPlay,
  onPause,
  onReplay,
  disabled,
  playing,
}: {
  onPlay?: () => void;
  onPause?: () => void;
  onReplay?: () => void;
  disabled?: boolean;
  playing?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={onPlay} disabled={disabled || playing}>
        Play explanation
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={onPause}
        disabled={!playing}
      >
        Pause
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onReplay}
        disabled={disabled}
      >
        Replay
      </Button>
    </div>
  );
}
