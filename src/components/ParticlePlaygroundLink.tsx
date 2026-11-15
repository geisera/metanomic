"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ParticlePlaygroundLink.module.css";

export default function ParticlePlaygroundLink() {
  const pathname = usePathname();
  if (!["/", "/enterprise-ai-stack", "/contact"].includes(pathname)) return null;
  return <div className={styles.space}><Link href="/particles" className={styles.link}>I just want to play with the particles</Link></div>;
}
