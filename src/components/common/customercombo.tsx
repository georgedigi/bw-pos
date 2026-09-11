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

export function CustomerComboBox({ type, data, setSelected }: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedStatus, setSelectedStatus] = useState<Customer | null>(null);
  const [list, setList] = useState<any[] | null>([]);
  useEffect(() => {
    setList(data as Customer[]);
    data && setSelected((data as Customer[])[0]);
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
              <>{selectedStatus.br_name}</>
            ) : list && list.length > 0 ? (
              list[0].br_name
            ) : (
              <>Set {type}</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className=" w-[200px] p-0" align="end" side="right">
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
            <>{selectedStatus.br_name}</>
          ) : list && list.length > 0 ? (
            list[0].br_name
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
  data: Customer[];
  setOpen: (open: boolean) => void;
  setSelectedStatus: (status: Customer | null) => void;
}) {
  return (
    <Command className=" z-10 bg-white ">
      <CommandInput placeholder="Find Customer..." />
      <CommandList className="no-scrollbar">
        <CommandEmpty>No results found.</CommandEmpty>
        {data && (
          <CommandGroup>
            {data.map((customer) => (
              <CommandItem
                key={customer.branch_code}
                value={customer.br_name}
                onSelect={(value) => {
                  setSelectedStatus(
                    data.find((customer) => customer.br_name === value) ?? null,
                  );
                  setOpen(false);
                }}
              >
                {customer.br_name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
