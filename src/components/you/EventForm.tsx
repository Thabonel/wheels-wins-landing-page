
import React, { useEffect } from "react";
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

interface EventFormProps {
  defaultDate: Date;
  defaultHour: number;
  defaultStartTime?: string;
  defaultEndTime?: string;
  isEditing?: boolean;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
}

const EventForm: React.FC<EventFormProps> = ({
  defaultDate,
  defaultHour,
  defaultStartTime,
  defaultEndTime,
  isEditing = false,
  onSubmit,
  onCancel,
}) => {
  // Format time strings if needed
  const formatTimeToString = (hour: number, minute: number = 0) => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  // Get default start/end times
  const getDefaultStartTime = () => {
    return defaultStartTime || formatTimeToString(defaultHour);
  };
  
  const getDefaultEndTime = () => {
    return defaultEndTime || formatTimeToString(defaultHour + 1);
  };

  const form = useForm<EventFormData>({
    defaultValues: {
      title: "",
      type: "reminder",
      date: defaultDate,
      startTime: getDefaultStartTime(),
      endTime: getDefaultEndTime(),
    },
  });

  // Update form values when defaultValues change
  useEffect(() => {
    form.reset({
      title: form.getValues("title"),
      type: form.getValues("type"),
      date: defaultDate,
      startTime: defaultStartTime || formatTimeToString(defaultHour),
      endTime: defaultEndTime || formatTimeToString(defaultHour + 1),
    });
  }, [defaultDate, defaultHour, defaultStartTime, defaultEndTime]);

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
          <Button type="submit">{isEditing ? "Update Event" : "Save Event"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default EventForm;
