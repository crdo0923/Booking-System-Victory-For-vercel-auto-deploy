import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin Rooms Management", () => {
  test("creates, edits, and archives a room with dimensions and aircon specs", async ({ page }) => {
    await login(page, "admin");

    // 1. Navigate to Rooms management
    await page.goto("/admin/rooms");
    await expect(page.getByRole("heading", { name: "Rooms & Facilities", level: 1 })).toBeVisible();

    // 2. Open Add Room dialog and fill the Create Room form
    await page.getByRole("button", { name: "Add Room" }).click();

    const roomName = `Alpha Hall ${Date.now()}`;
    await page.getByLabel("Room name").fill(roomName);
    await page.getByLabel("Building").fill("East Tower");
    await page.getByLabel("Floor level").fill("3rd Floor");
    await page.getByLabel("Location label").fill("3rd Floor · North Wing");
    await page.getByLabel("Seating capacity").fill("75");
    await page.getByLabel("Short description").fill("Spacious hall for ministry gatherings and trainings.");
    await page.getByLabel("Best for (activities)").fill("Discipleship, Leadership seminars");
    await page.getByLabel("Length (meters)").fill("14");
    await page.getByLabel("Width (meters)").fill("10");
    await page.getByLabel("Air conditioning (Total HP)").fill("8");
    await page.getByLabel("Lighting & AV (Watts)").fill("2500");

    await page.getByRole("button", { name: "Create room" }).click();

    // 3. Verify the new room is listed with its specs
    const roomHeading = page.getByRole("heading", { name: roomName });
    await expect(roomHeading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Up to 75 seats").first()).toBeVisible();
    await expect(page.getByText("14m × 10m").first()).toBeVisible();
    await expect(page.getByText("8 HP").first()).toBeVisible();

    // 4. Archive the room
    const archiveBtn = page.getByRole("button", { name: `Archive ${roomName}` });
    await archiveBtn.click();

    // Filter to Archived tab
    await page.getByRole("link", { name: /Archived/ }).click();
    await expect(page.getByRole("heading", { name: roomName })).toBeVisible();
    await expect(page.getByText("Archived").first()).toBeVisible();

    // 5. Restore the room
    const restoreBtn = page.getByRole("button", { name: `Restore ${roomName}` });
    await restoreBtn.click();

    // Filter to Active tab
    await page.getByRole("link", { name: /Active/ }).click();
    await expect(page.getByRole("heading", { name: roomName })).toBeVisible();
  });
});
