"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { scrollToId } from "../scroll/scrollState";

/**
 * Link to a home-page section. On the home page it glides there with Lenis;
 * from any other page it navigates to `/#id` and the layout scrolls on arrival.
 */
export default function SectionLink({ id, onClick, ...rest }: { id: string } & Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  return (
    <Link
      href={`/#${id}`}
      scroll={false}
      onClick={(e) => {
        onClick?.(e);
        if (pathname === "/") {
          e.preventDefault();
          scrollToId(id);
        }
      }}
      {...rest}
    />
  );
}
