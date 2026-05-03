'use client';

import { Plus } from 'lucide-react';

type Props = {
  placeholder?: string;
  onPlusClick?: () => void;
  /** Optional controlled value. When both value and onChange are provided,
   *  the input becomes controlled (so callers can prefill it programmatically). */
  value?: string;
  onChange?: (v: string) => void;
};

export default function MainInputBar({
  placeholder = '메시지를 입력하세요',
  onPlusClick,
  value,
  onChange,
}: Props) {
  const isControlled = value !== undefined && onChange !== undefined;
  const controlledProps = isControlled
    ? {
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onChange!(e.target.value),
      }
    : {};

  return (
    <div
      className="flex items-center gap-2 rounded-2xl bg-white/[0.035] px-2 py-2
                 ring-1 ring-white/[0.08] backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={onPlusClick}
        aria-label="추가"
        className="flex h-10 w-10 shrink-0 items-center justify-center
                   rounded-full bg-white/[0.05] ring-1 ring-white/[0.08]
                   transition active:scale-95"
      >
        <Plus className="h-4 w-4 text-white/65" strokeWidth={1.5} />
      </button>

      <input
        type="text"
        placeholder={placeholder}
        {...controlledProps}
        className="flex-1 bg-transparent px-1 text-[15px] font-light
                   text-white/90 placeholder:text-white/30 focus:outline-none"
      />
    </div>
  );
}
