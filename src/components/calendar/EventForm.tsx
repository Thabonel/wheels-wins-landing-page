
import React from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { EventFormData } from "./types";
import { formatTimeToString } from "./utils";

interface EventFormProps {
  defaultDate: Date;
  defaultHour: number;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
}

const EventForm: React.FC<EventFormProps> = ({
  defaultDate,
  defaultHour,
  onSubmit,
  onCancel,
}) => {
  const form = useForm<EventFormData>({
    defaultValues: {
      title: "",
      type: "reminder",
      date: defaultDate,
      startTime: formatTimeToString(defaultHour),
      endTime: formatTimeToString(defaultHour + 1),
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter event title" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="trip">Trip</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Event</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default EventForm;
