import { Button } from "@/components/ui/button";

export function BoardToolbar({
  onPlay,
  onPause,
  onReplay,
  disabled,
}: {
  onPlay?: () => void;
  onPause?: () => void;
  onReplay?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={onPlay} disabled={disabled}>
        Play explanation
      </Button>
      <Button type="button" variant="secondary" onClick={onPause} disabled={disabled}>
        Pause
      </Button>
      <Button type="button" variant="outline" onClick={onReplay} disabled={disabled}>
        Replay
      </Button>
    </div>
  );
}
