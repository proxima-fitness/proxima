import { FlameIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

export const BurnBarrel = ({ setCards }) => {
    const [active, setActive] = useState(false);

    const handleDragOver = (e) => {
      e.preventDefault();
      setActive(true);
    };

    const handleDragLeave = () => {
      setActive(false);
    };

    const handleDragEnd = (e) => {
      const cardId = e.dataTransfer.getData("cardId");

      setCards((pv) => pv.filter((c) => c.id !== cardId));

      setActive(false);
    };

    return (
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded border text-3xl ${
          active
            ? "border-red-800 bg-red-800/20 text-red-500"
            : "border-neutral-500 bg-neutral-500/20 text-neutral-500"
        }`}
      >
        {active ? <FlameIcon className="animate-bounce" /> : <Trash2Icon />}
      </div>
    );
  };
