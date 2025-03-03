"use client";

import styles from "./OverflowWrapper.module.scss";

interface Props {
  children: React.ReactNode;
}

export function OverflowWrapper({ children }: Props) {
  return <div className={styles.OverflowWrapper}>{children}</div>;
}
