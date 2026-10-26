
async function fulfillOrder(client, db, orderId) {
  const orders = db.collection("orders");
  const inventory = db.collection("digital_codes");
  const session = client.startSession();

  try {
    let result = { status: "pending" };

    await session.withTransaction(async () => {
      const order = await orders.findOne(
        { _id: orderId },
        { session }
      );

      if (!order || order.status !== "paid") {
        result = { status: "not_paid" };
        return;
      }

      if (
        order.deliveryStatus === "delivered" &&
        Array.isArray(order.deliveredItems)
      ) {
        result = {
          status: "delivered",
          items: order.deliveredItems
        };
        return;
      }

      // Comprueba que haya stock para todo el pedido antes de asignarlo.
      for (const item of order.items) {
        const available = await inventory.countDocuments(
          {
            productId: item.id,
            assignedOrderId: null
          },
          { session }
        );

        if (available < item.quantity) {
          const error = new Error("OUT_OF_STOCK");
          error.code = "OUT_OF_STOCK";
          throw error;
        }
      }

      const deliveredItems = [];

      for (const item of order.items) {
        const codes = [];

        for (let i = 0; i < item.quantity; i++) {
          const code = await inventory.findOneAndUpdate(
            {
              productId: item.id,
              assignedOrderId: null
            },
            {
              $set: {
                assignedOrderId: order._id,
                assignedAt: new Date()
              }
            },
            {
              session,
              sort: { _id: 1 },
              returnDocument: "after",
              includeResultMetadata: false
            }
          );

          if (!code || !code.code) {
            const error = new Error("OUT_OF_STOCK");
            error.code = "OUT_OF_STOCK";
            throw error;
          }

          codes.push(code.code);
        }

        deliveredItems.push({
          productId: item.id,
          name: item.name,
          codes
        });
      }

      await orders.updateOne(
        { _id: order._id, status: "paid" },
        {
          $set: {
            deliveryStatus: "delivered",
            deliveredItems,
            deliveredAt: new Date(),
            updatedAt: new Date()
          }
        },
        { session }
      );

      result = {
        status: "delivered",
        items: deliveredItems
      };
    });

    return result;
  } catch (error) {
    if (error.code === "OUT_OF_STOCK") {
      await orders.updateOne(
        {
          _id: orderId,
          status: "paid",
          deliveryStatus: { $ne: "delivered" }
        },
        {
          $set: {
            deliveryStatus: "manual_required",
            updatedAt: new Date()
          }
        }
      );

      return { status: "manual_required" };
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { fulfillOrder };
