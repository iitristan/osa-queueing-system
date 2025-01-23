"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function Admin() {
  const [isMounted, setIsMounted] = useState(false);

  // State for queues
  const [queues, setQueues] = useState([
    { id: "q1", name: "S07" },
    { id: "q2", name: "S08" },
  ]);

  // State for counters
  const [counters, setCounters] = useState({
    counter1: {
      id: "counter1",
      name: "Counter 1 - Sir Harold",
      items: [{ id: "q3", name: "S09" }],
    },
    counter2: {
      id: "counter2",
      name: "Counter 2",
      items: [],
    },
    counter3: {
      id: "counter3",
      name: "Counter 3",
      items: [],
    },
    counter4: {
      id: "counter4",
      name: "Counter 4",
      items: [],
    },
  });

  // State for search
  const [searchTerms, setSearchTerms] = useState({
    counter1: "",
    counter2: "",
    counter3: "",
    counter4: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement to start dragging
      },
    })
  );

  // Handle drag and drop
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find the source and destination columns
    const sourceColumn = Object.values(counters).find((column) =>
      column.items.some((item) => item.id === active.id)
    );
    const destinationColumn = Object.values(counters).find((column) =>
      column.items.some((item) => item.id === over.id)
    );

    if (!sourceColumn || !destinationColumn) return;

    const sourceIndex = sourceColumn.items.findIndex((item) => item.id === active.id);
    const destinationIndex = destinationColumn.items.findIndex((item) => item.id === over.id);

    // If moving within the same column
    if (sourceColumn.id === destinationColumn.id) {
      const newItems = arrayMove(sourceColumn.items, sourceIndex, destinationIndex);

      setCounters((prevCounters) => ({
        ...prevCounters,
        [sourceColumn.id]: {
          ...sourceColumn,
          items: newItems,
        },
      }));
    } else {
      // If moving between columns
      const newSourceItems = [...sourceColumn.items];
      const [movedItem] = newSourceItems.splice(sourceIndex, 1);

      const newDestinationItems = [...destinationColumn.items];
      newDestinationItems.splice(destinationIndex, 0, movedItem);

      setCounters((prevCounters) => ({
        ...prevCounters,
        [sourceColumn.id]: {
          ...sourceColumn,
          items: newSourceItems,
        },
        [destinationColumn.id]: {
          ...destinationColumn,
          items: newDestinationItems,
        },
      }));
    }
  };

  // Handle search
  const handleSearch = (key, value) => {
    setSearchTerms({ ...searchTerms, [key]: value });
  };

  // Sortable Item Component
  const SortableItem = ({ id, name }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-gray-100 border border-gray-300 rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        {name}
      </div>
    );
  };

  // Combine all items from all columns for SortableContext
  const allItems = Object.values(counters).flatMap((column) => column.items);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-[#111111] border-b-4 border-[#FCBF15]">
        <div className="container mx-auto p-4">
          <Image
            src="/osa_header.png"
            alt="UST Logo"
            width={500}
            height={200}
            className="p-3"
          />
        </div>
      </nav>

      {/* Now Serving Section */}
      <div className="bg-[#D0D0D0] py-8 text-center">
        <h2 className="text-4xl font-semibold text-gray-800">Now Serving</h2>
        <h1 className="text-6xl font-extrabold text-[#FCBF15] mt-2">
          {queues[0]?.name || "No Queue"}
        </h1>
        <h2 className="text-2xl font-medium text-gray-600 mt-4">
          Proceed to <span className="font-bold">Counter 2</span>
        </h2>
      </div>

      {/* Search Section */}
      <div className="container mx-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Name</h2>
          <input
            type="text"
            placeholder="Search..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Reason for Visit</h2>
          <input
            type="text"
            placeholder="Search..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Organization</h2>
          <input
            type="text"
            placeholder="Search..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Time</h2>
          <input
            type="text"
            placeholder="Search..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
          />
        </div>
      </div>

      {/* Drag-and-Drop Queues */}
      <div className="container mx-auto p-6">
        {isMounted && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allItems.map((item) => item.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.values(counters).map((column) => (
                  <div
                    key={column.id}
                    className="bg-white border border-gray-300 rounded-lg shadow-lg p-4"
                  >
                    <h2 className="text-xl font-semibold mb-4">{column.name}</h2>

                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#FCBF15]"
                      value={searchTerms[column.id]}
                      onChange={(e) => handleSearch(column.id, e.target.value)}
                    />

                    <div className="space-y-2">
                      {column.items
                        .filter((item) =>
                          item.name
                            .toLowerCase()
                            .includes(searchTerms[column.id].toLowerCase())
                        )
                        .map((item) => (
                          <SortableItem key={item.id} id={item.id} name={item.name} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}