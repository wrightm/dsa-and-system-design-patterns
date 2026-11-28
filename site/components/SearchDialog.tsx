"use client";

import { useStaticSearch } from "fumadocs-core/search/client";
import {
  SearchDialog as Dialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { BASE_PATH } from "../lib/site";

// Searches the static Orama index exported at build time; no server needed.
export default function SearchDialog(props: SharedProps) {
  const search = useStaticSearch({ from: `${BASE_PATH}/api/search` });
  return (
    <Dialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </Dialog>
  );
}
