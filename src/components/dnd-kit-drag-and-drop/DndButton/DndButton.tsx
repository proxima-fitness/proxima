"use client";

import { HTMLAttributes } from "react";
import classNames from "classnames";

import styles from "./DndButton.module.scss";

export interface Props extends HTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function DndButton({ children, ...props }: Props) {
  return (
    <button
      className={classNames(styles.DndButton)}
      style={{ background: "red" }}
      {...props}
    >
      {children}
    </button>
  );
}
