"use client";

import { useState } from "react";

interface IExpandableTextProps {
    text: string;
    maxLines?: number;
    maxLength?: number;
}

export const ExpandableText: React.FC<IExpandableTextProps> = ({
    text,
    maxLines = 3,
    maxLength = 150,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isTruncatable = text.length > maxLength;

    return (
        <div>
            <p
                style={
                    !isExpanded && isTruncatable
                        ? {
                              display: "-webkit-box",
                              WebkitLineClamp: maxLines,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                          }
                        : undefined
                }
            >
                {text}
            </p>
            {isTruncatable && (
                <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="mt-1 text-sm text-secondary dark:text-lightSecondary hover:underline"
                >
                    {isExpanded ? "See less" : "See more..."}
                </button>
            )}
        </div>
    );
};
