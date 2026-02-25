"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  GripVertical,
  Trash2,
  Plus,
  Clock,
  Eye,
  Utensils,
  Car,
  Smile,
  Bed,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity, DayPlan } from "@/types/ai.types";

// ── Category helpers ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<Activity["category"], React.ReactNode> = {
  SIGHTSEEING: <Eye className="h-3.5 w-3.5" />,
  FOOD: <Utensils className="h-3.5 w-3.5" />,
  TRANSPORT: <Car className="h-3.5 w-3.5" />,
  LEISURE: <Smile className="h-3.5 w-3.5" />,
  ACCOMMODATION: <Bed className="h-3.5 w-3.5" />,
  OTHER: <MoreHorizontal className="h-3.5 w-3.5" />,
};

const CATEGORY_COLORS: Record<Activity["category"], string> = {
  SIGHTSEEING: "bg-blue-100 text-blue-600",
  FOOD: "bg-orange-100 text-orange-600",
  TRANSPORT: "bg-gray-100 text-gray-600",
  LEISURE: "bg-green-100 text-green-600",
  ACCOMMODATION: "bg-purple-100 text-purple-600",
  OTHER: "bg-slate-100 text-slate-600",
};

// ── Editable activity ───────────────────────────────────────────────────────

interface EditableActivity extends Activity {
  id: string;
  dayNumber: number;
}

let _counter = 0;
function nextId(prefix: string) {
  return `${prefix}-${++_counter}`;
}

function buildEditable(days: DayPlan[]): EditableActivity[] {
  return days.flatMap((day) =>
    day.activities.map((act) => ({
      ...act,
      id: nextId(`act`),
      dayNumber: day.dayNumber,
    })),
  );
}

// ── Single sortable activity row ────────────────────────────────────────────

interface ActivityRowProps {
  activity: EditableActivity;
  onDelete: (id: string) => void;
  onUpdateTime: (id: string, time: string) => void;
  overlay?: boolean;
}

function ActivityRow({
  activity,
  onDelete,
  onUpdateTime,
  overlay = false,
}: ActivityRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border border-gray-100 bg-white p-3 transition-shadow",
        isDragging && !overlay && "opacity-30",
        overlay && "shadow-xl ring-2 ring-orange-300",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Arrastar atividade"
        className="mt-0.5 shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Category icon */}
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          CATEGORY_COLORS[activity.category],
        )}
        aria-hidden="true"
      >
        {CATEGORY_ICONS[activity.category]}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        {activity.description && (
          <p className="mt-0.5 text-xs text-gray-500">{activity.description}</p>
        )}
      </div>

      {/* Time input */}
      <input
        type="time"
        value={activity.time ?? ""}
        onChange={(e) => onUpdateTime(activity.id, e.target.value)}
        aria-label={`Horário de ${activity.title}`}
        className="w-20 shrink-0 rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 focus:border-orange-400 focus:outline-none"
      />

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(activity.id)}
        aria-label={`Excluir ${activity.title}`}
        className="mt-0.5 shrink-0 text-gray-200 opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Day column ──────────────────────────────────────────────────────────────

interface DayColumnProps {
  day: { dayNumber: number; theme?: string; date?: string };
  activities: EditableActivity[];
  onDelete: (id: string) => void;
  onUpdateTime: (id: string, time: string) => void;
  onAddActivity: (dayNumber: number) => void;
}

function DayColumn({
  day,
  activities,
  onDelete,
  onUpdateTime,
  onAddActivity,
}: DayColumnProps) {
  const ids = activities.map((a) => a.id);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
          {day.dayNumber}
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {day.theme ?? `Dia ${day.dayNumber}`}
        </span>
      </div>

      {/* Sortable activities */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {activities.map((act) => (
            <ActivityRow
              key={act.id}
              activity={act}
              onDelete={onDelete}
              onUpdateTime={onUpdateTime}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add activity */}
      <button
        type="button"
        onClick={() => onAddActivity(day.dayNumber)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-orange-300 hover:text-orange-500"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar atividade
      </button>
    </div>
  );
}

// ── Main editor ─────────────────────────────────────────────────────────────

interface DraggableActivityListProps {
  plan: { days: DayPlan[] };
}

export function DraggableActivityList({ plan }: DraggableActivityListProps) {
  const [activities, setActivities] = useState<EditableActivity[]>(() =>
    buildEditable(plan.days),
  );
  const [activeActivity, setActiveActivity] =
    useState<EditableActivity | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  // Group by day
  const days = plan.days.map((d) => ({
    dayNumber: d.dayNumber,
    theme: d.theme,
    date: d.date,
  }));

  function activitiesForDay(dayNumber: number): EditableActivity[] {
    return activities.filter((a) => a.dayNumber === dayNumber);
  }

  function handleDragStart(event: DragStartEvent) {
    const found = activities.find((a) => a.id === event.active.id);
    setActiveActivity(found ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeAct = activities.find((a) => a.id === active.id);
    const overAct = activities.find((a) => a.id === over.id);

    if (!activeAct || !overAct) return;

    if (activeAct.dayNumber !== overAct.dayNumber) {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === active.id ? { ...a, dayNumber: overAct.dayNumber } : a,
        ),
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveActivity(null);
    if (!over || active.id === over.id) return;

    setActivities((prev) => {
      const oldIdx = prev.findIndex((a) => a.id === active.id);
      const newIdx = prev.findIndex((a) => a.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }

  function handleDelete(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  function handleUpdateTime(id: string, time: string) {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, time } : a)),
    );
  }

  function handleAddActivity(dayNumber: number) {
    const newAct: EditableActivity = {
      id: nextId("new"),
      dayNumber,
      title: "",
      description: "",
      category: "OTHER",
      time: undefined,
      durationMinutes: undefined,
      estimatedCost: undefined,
    };
    setActivities((prev) => [...prev, newAct]);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {days.map((day) => (
          <DayColumn
            key={day.dayNumber}
            day={day}
            activities={activitiesForDay(day.dayNumber)}
            onDelete={handleDelete}
            onUpdateTime={handleUpdateTime}
            onAddActivity={handleAddActivity}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeActivity && (
          <ActivityRow
            activity={activeActivity}
            onDelete={() => {}}
            onUpdateTime={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
