
async function fulfillOrder(client, db, orderId) {
  const orders = db.collection("orders");
  const inventory = db.collection("digital_codes");
  const session = client.startSession();

  try {
    let outcome = { status: "pending" };

    await session.withTransaction(async () => {
      const order = await orders.findOne(
        { _id: orderId },
        { session }
      );

      if (!order || order.status !== "paid") {
        outcome = { status: "not_paid" };
        return;
      }

      if (
        order.deliveryStatus === "delivered" &&
        Array.isArray(order.deliveredItems)
      ) {
        outcome = {
          status: "delivered",
          items: order.deliveredItems
        };
        return;
      }

      const delivery = [];

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
              returnDocument: "after"
            }
          );

          if (!code || !code.code) {
            const error = new Error("OUT_OF_STOCK");
            error.code = "OUT_OF_STOCK";
            throw error;
          }

          codes.push(code.code);
        }

        delivery.push({
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
            deliveredItems: delivery,
            deliveredAt: new Date(),
            updatedAt: new Date()
          }
        },
        { session }
      );

      outcome = {
        status: "delivered",
        items: delivery
      };
    });

    return outcome;
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
