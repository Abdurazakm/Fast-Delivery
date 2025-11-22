import dayjs from "dayjs";

export default function TrackingInfoCard({ order, hideCustomerWhenManual }) {
  const statusSteps = ["pending", "in_progress", "arrived", "delivered"];
  const currentIndex = statusSteps.indexOf(order.status);

  // Normalize manual check to match TrackOrder logic
  const isManual =
    (order?.source || "").toString().trim().toLowerCase() === "manual";

  const statusMessages = {
    pending: "✅ Your order has been received.",
    in_progress: "👩‍🍳 Your order is being prepared.",
    arrived: "🚴‍♂️ Your order is on the way!",
    delivered: "🎉 Your order has been delivered.",
  };

  return (
    <div className="mt-3 p-4 rounded-lg bg-blue-50 border border-blue-300 text-blue-800 text-sm text-left">
      <div className="font-semibold mb-2">📦 Order Details</div>

      {/* CUSTOMER NAME SECTION */}
      {!isManual && !hideCustomerWhenManual && order.customerName && (
        <div className="mb-1">
          <strong>Customer:</strong> {order.customerName}
        </div>
      )}

      {/* SHOW LOCATION WHEN MANUAL */}
      {isManual && (
        <div className="mb-1">
          <strong>Location:</strong> {order.location}
        </div>
      )}

      {/* STATUS */}
      <div className="mb-1">
        <strong>Status:</strong> {order.status.replace("_", " ")}
      </div>

      {/* TRACK URL */}
      {order.trackUrl && (
        <div className="mt-2">
          <a
            href={order.trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 mt-1 inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
          >
            🔗 Track Order
          </a>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div className="mt-4 overflow-x-auto">
        <div className="flex items-center space-x-4 min-w-max">
          {statusSteps.map((status, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div key={status} className="flex flex-col items-center relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 
                    ${
                      isCompleted
                        ? "bg-green-500"
                        : isCurrent
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-300"
                    }`}
                >
                  {idx + 1}
                </div>
                <span className="mt-1 text-xs text-center capitalize w-20">
                  {status.replace("_", " ")}
                </span>

                {idx < statusSteps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-1 -translate-x-1/2 ${
                      idx < currentIndex ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="relative h-1 bg-gray-300 rounded mt-3">
          <div
            className="absolute h-1 bg-green-500 rounded transition-all duration-700 ease-in-out"
            style={{
              width: `${((currentIndex + 1) / statusSteps.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* STATUS MESSAGE */}
      <div className="mt-2 p-2 bg-green-50 text-green-700 rounded border border-green-100 text-xs">
        {statusMessages[order.status] || "Tracking your order..."}
      </div>

      {/* DATE */}
      <div className="mt-2 text-xs text-gray-500">
        Placed on: {dayjs(order.createdAt).format("YYYY-MM-DD HH:mm")}
      </div>
    </div>
  );
}
