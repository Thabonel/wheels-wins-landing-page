import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";

interface MaintenanceTask {
  id: number;
  task: string;
  date: string;
  mileage: number;
  status: "upcoming" | "overdue" | "completed";
}

export default function VehicleMaintenance() {
  const { user } = useAuth();
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formTask, setFormTask] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formMileage, setFormMileage] = useState<number>(0);

  // Fetch tasks from Supabase
  const fetchTasks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("id, task, date, mileage")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    if (error) {
      toast.error("Error loading tasks.");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const mapped = data!.map((r) => {
      let status: MaintenanceTask["status"] = r.date < today ? "overdue" : "upcoming";
      return { id: r.id, task: r.task, date: r.date, mileage: r.mileage, status };
    });
    setMaintenanceTasks(mapped);
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const openAddModal = () => {
    setFormTask("");
    setFormDate("");
    setFormMileage(0);
    setShowModal(true);
  };

  const handleModalSubmit = async () => {
    if (!user) {
      toast.error("You must be signed in.");
      setShowModal(false);
      return;
    }
    if (!formTask || !formDate) {
      toast.error("Please fill in all fields.");
      return;
    }

    // Insert new record
    const { error } = await supabase
      .from("maintenance_records")
      .insert([{ user_id: user.id, task: formTask, date: formDate, mileage: formMileage }]);
    setShowModal(false);
    if (error) {
      toast.error("Error saving record.");
      return;
    }

    // Dispatch calendar event
    window.postMessage(
      {
        type: "ADD_CALENDAR_EVENT",
        event: { title: formTask, date: formDate, notes: `Scheduled via Pam: ${formTask}` },
      },
      "*"
    );
    toast.success(`Saved: ${formTask} on ${formDate}`);
    fetchTasks();
  };

  return (
    <div className="relative space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Maintenance Timeline</h3>
        <button onClick={openAddModal} className="bg-primary text-white py-1 px-3 rounded-md text-sm shadow">
          Add Task
        </button>
      </div>

      <div className="space-y-6">
        {/* Overdue */}
        <div>
          <h4 className="font-medium text-red-600 mb-2">Overdue</h4>
          <div className="space-y-2">
            {maintenanceTasks.filter((t) => t.status === "overdue").map((task) => (
              <Card key={task.id} className="border-red-200 bg-red-50">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold">{task.task}</h5>
                    <p className="text-sm text-gray-600">Due: {task.date}</p>
                    <p className="text-sm text-gray-600">Mileage: {task.mileage.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFormTask(task.task);
                      setFormDate(task.date);
                      setFormMileage(task.mileage);
                      setShowModal(true);
                    }}
                    className="bg-primary text-white py-1 px-3 rounded-md text-sm"
                  >
                    Schedule
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <h4 className="font-medium text-blue-600 mb-2">Upcoming</h4>
          <div className="space-y-2">
            {maintenanceTasks.filter((t) => t.status === "upcoming").map((task) => (
              <Card key={task.id} className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold">{task.task}</h5>
                    <p className="text-sm text-gray-600">Due: {task.date}</p>
                    <p className="text-sm text-gray-600">Mileage: {task.mileage.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFormTask(task.task);
                      setFormDate(task.date);
                      setFormMileage(task.mileage);
                      setShowModal(true);
                    }}
                    className="bg-primary text-white py-1 px-3 rounded-md text-sm"
                  >
                    Schedule
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h4 className="font-medium text-green-600 mb-2">Completed</h4>
          <div className="space-y-2">
            {maintenanceTasks.filter((t) => t.status === "completed").map((task) => (
              <Card key={task.id} className="border-green-200 bg-green-50">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold">{task.task}</h5>
                    <p className="text-sm text-gray-600">Completed: {task.date}</p>
                    <p className="text-sm text-gray-600">Mileage: {task.mileage.toLocaleString()}</p>
                  </div>
                  <span className="text-green-600 text-sm font-medium">✓ Done</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h4 className="text-lg font-semibold mb-4">Add / Schedule Task</h4>
            <label className="block mb-2 text-sm">Task Name</label>
            <input
              type="text"
              value={formTask}
              onChange={(e) => setFormTask(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />
            <label className="block mb-2 text-sm">Service Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />
            <label className="block mb-2 text-sm">Vehicle Mileage</label>
            <input
              type="number"
              value={formMileage}
              onChange={(e) => setFormMileage(Number(e.target.value))}
              className="w-full mb-4 p-2 border rounded"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded border">
                Cancel
              </button>
              <button onClick={handleModalSubmit} className="bg-primary text-white px-4 py-2 rounded">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
