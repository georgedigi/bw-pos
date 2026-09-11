import { useEffect, useState } from "react";
import { useMediaQuery } from "~/hooks/use-media-query";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";

import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export function ComboBoxResponsive({ type, data, setSelected }: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedStatus, setSelectedStatus] = useState<SiteCompany | null>(
    null,
  );
  const [list, setList] = useState<any[] | null>([]);
  useEffect(() => {
    setList(data as any[]);
    data && setSelected((data as any[])[0]);
  }, [data, setSelected]);
  useEffect(() => {
    setSelected(selectedStatus);
  }, [selectedStatus, setSelected]);

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="font-sm w-full justify-start text-sm text-gray-500"
          >
            {selectedStatus ? (
              <>{selectedStatus.branch}</>
            ) : list && list.length > 0 ? (
              list[0].branch
            ) : (
              <>Set {type}</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <StatusList
            data={list!}
            setOpen={setOpen}
            setSelectedStatus={setSelectedStatus}
          />
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {selectedStatus ? (
            <>{selectedStatus.branch}</>
          ) : list && list.length > 0 ? (
            list[0].branch
          ) : (
            <> Set {type}</>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <StatusList
            data={list!}
            setOpen={setOpen}
            setSelectedStatus={setSelectedStatus}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StatusList({
  data,
  setOpen,
  setSelectedStatus,
}: {
  data: any[];
  setOpen: (open: boolean) => void;
  setSelectedStatus: (status: SiteCompany | null) => void;
}) {
  return (
    <Command className="z-10 bg-white ">
      <CommandInput placeholder="Filter status..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {data && (
          <CommandGroup>
            {(data as SiteCompany[]).map((site) => (
              <CommandItem
                key={site.branch}
                value={site.branch}
                onSelect={(value) => {
                  setSelectedStatus(
                    (data as SiteCompany[]).find(
                      (site) => site.branch === value,
                    ) ?? null,
                  );
                  setOpen(false);
                }}
              >
                {site.branch}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
