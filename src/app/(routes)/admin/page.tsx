"use client";

import Image from "next/image";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export default function Admin() {
  // State for queues
  const [queues, setQueues] = useState([
    { id: "q1", name: "S07" },
    { id: "q2", name: "S08" },
  ]);

  // State for counters
  const [counters, setCounters] = useState({
    counter1: { name: "Counter 1 - Sir Harold", items: [{ id: "q3", name: "S09" }] },
    counter2: { name: "Counter 2", items: [] },
    counter3: { name: "Counter 3", items: [] },
    counter4: { name: "Counter 4", items: [] },
  });

  // State for search
  const [searchTerms, setSearchTerms] = useState({
    counter1: "",
    counter2: "",
    counter3: "",
    counter4: "",
  });

  // Handle drag and drop
  const onDragEnd = (result) => {
    const { source, destination } = result;

    // No destination (dragged outside)
    if (!destination) return;

    // Reordering within the same column
    if (source.droppableId === destination.droppableId) {
      const column = counters[source.droppableId];
      const reorderedItems = Array.from(column.items);
      const [movedItem] = reorderedItems.splice(source.index, 1);
      reorderedItems.splice(destination.index, 0, movedItem);

      setCounters({
        ...counters,
        [source.droppableId]: { ...column, items: reorderedItems },
      });
    } else {
      // Moving between columns
      const sourceColumn = counters[source.droppableId];
      const destColumn = counters[destination.droppableId];
      const sourceItems = Array.from(sourceColumn.items);
      const destItems = Array.from(destColumn.items);

      const [movedItem] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, movedItem);

      setCounters({
        ...counters,
        [source.droppableId]: { ...sourceColumn, items: sourceItems },
        [destination.droppableId]: { ...destColumn, items: destItems },
      });
    }
  };

  // Handle search
  const handleSearch = (key, value) => {
    setSearchTerms({ ...searchTerms, [key]: value });
  };

  return (
    <div className="h-[100dvh] overflow-hidden">
      <nav className="bg-[#111111] border-[#FCBF15] border-b-4">
        <Image
          src="/osa_header.png"
          alt="UST Logo"
          width={500}
          height={200}
          className="p-3"
        />
      </nav>

      {/* Now Serving Section */}
      <div className="bg-[#D0D0D0] p-6 text-center">
        <h2 className="text-4xl font-semibold text-gray-800">Now Serving</h2>
        <h1 className="text-6xl font-extrabold text-[#FCBF15]">
          {queues[0]?.name || "No Queue"}
        </h1>
        <h2 className="text-2xl font-medium text-gray-600 mt-2">
          Proceed to <span className="font-bold">Counter 2</span>
        </h2>
      </div>

      {/* Drag-and-Drop Queues */}
      <div className="grid grid-cols-4 gap-4 p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.entries(counters).map(([key, column]) => (
            <Droppable key={key} droppableId={key}>
              {(provided) => (
                <div
                  className="bg-white border border-gray-300 rounded shadow p-4"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  <h2 className="text-xl font-semibold mb-4">{column.name}</h2>

                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full border border-gray-300 rounded p-2 mb-4"
                    value={searchTerms[key]}
                    onChange={(e) => handleSearch(key, e.target.value)}
                  />

                  {/* Draggable Items */}
                  <div className="space-y-2">
                    {column.items
                      .filter((item) =>
                        item.name
                          .toLowerCase()
                          .includes(searchTerms[key].toLowerCase())
                      )
                      .map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided) => (
                            <div
                              className="bg-gray-100 border border-gray-300 rounded p-2 text-center shadow"
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              {item.name}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}
