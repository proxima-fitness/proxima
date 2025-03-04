import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { v4 as uuidv4} from "uuid";

interface IProps {
    weekOrder: string;
    weekLength: number;
    filteredWeek: TProgramCreatorDay[];
    // handleNewProgram: (newProgram: TProgramCreatorDay[][]) => void;
}

export const AddCard: React.FC<IProps> = (props) => {
    const {
        weekOrder,
        weekLength,
        filteredWeek,
        // handleNewProgram,
    } = props;

    const [text, setText] = useState("");
    const [adding, setAdding] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();

      if (!text.trim().length) return;

      const newCard: TProgramCreatorDay = {
        weekOrder,
        order: String(weekLength + 1),
        id: uuidv4(),
      };


    //   setCards([...cards, newCard]);
    // do handleNewProgram here

      setAdding(false);
    };

    return (
      <>
        {adding ? (
          <motion.form layout onSubmit={handleSubmit}>
            <textarea
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="Add new task..."
              className="w-full rounded border border-violet-400 bg-violet-400/20 p-3 text-sm text-neutral-50 placeholder-violet-300 focus:outline-0"
            />
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
              >
                Close
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded bg-neutral-50 px-3 py-1.5 text-xs text-neutral-950 transition-colors hover:bg-neutral-300"
              >
                <span>Add</span>
                <PlusIcon />
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            layout
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
          >
            <span>Add card</span>
            <PlusIcon />
          </motion.button>
        )}
      </>
    );
  };
