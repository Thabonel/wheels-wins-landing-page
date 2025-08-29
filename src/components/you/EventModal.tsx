
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/common/AnimatedDialog";
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
  onDelete?: () => void;
  defaultTitle: string; // Add defaultTitle to interface
  defaultType: string; // Add defaultType to interface
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onOpenChange,
  isEditing,
  defaultDate,
  defaultHour,
  defaultStartTime,
  defaultEndTime,
  defaultTitle, // Destructure defaultTitle
  defaultType, // Destructure defaultType
  onSubmit,
  onCancel,
  onDelete,
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
          onDelete={onDelete}
          isEditing={isEditing}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
          defaultTitle={defaultTitle} // Pass defaultTitle to EventForm
          defaultType={defaultType} // Pass defaultType to EventForm
        />
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
