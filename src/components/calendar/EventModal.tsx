
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EventForm from "./EventForm";
import { EventFormData } from "./types";

interface EventModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  defaultDate: Date;
  defaultHour: number;
  defaultStartTime: string;
  defaultEndTime: string;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onOpenChange,
  isEditing,
  defaultDate,
  defaultHour,
  defaultStartTime,
  defaultEndTime,
  onSubmit,
  onCancel,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <EventForm 
          defaultDate={defaultDate}
          defaultHour={defaultHour}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isEditing={isEditing}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
