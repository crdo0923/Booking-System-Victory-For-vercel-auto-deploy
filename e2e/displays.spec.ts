import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Tablet & TV Wall Displays", () => {
  test("creates a display token and views the door sign and lobby hub", async ({ page }) => {
    await login(page, "admin");

    // 1. Navigate to Displays management in Admin
    await page.goto("/admin/displays");
    await expect(page.getByRole("heading", { name: "Displays", level: 1 })).toBeVisible();

    // 2. Pair a new door sign tablet using the form
    const displayLabel = `Youth Hall Entrance Tab ${Date.now()}`;
    await page.getByLabel(/Display Name \/ Location/i).fill(displayLabel);
    await page.getByRole("button", { name: /Generate Pairing Token/i }).click();

    // 3. Verify the newly paired display card appears
    await expect(page.getByText(displayLabel)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Door Sign Tablet/i).first()).toBeVisible();

    // 4. Test viewing Door Sign route with token
    await page.goto("/display/rooms/room-a?token=kiosk_door_room_a_seed");
    await expect(page.getByText(/Victory Room Display/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Room A" })).toBeVisible();
    await expect(page.getByText(/Available for Ministry|Room In Use/i)).toBeVisible();

    // 5. Test viewing Lobby TV Hub route with token
    await page.goto("/display/hub?token=kiosk_lobby_hub_seed");
    await expect(page.getByText(/Victory Church Facility Hub/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Room Directory & Today's Schedule/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Room A" })).toBeVisible();

    // 6. Test unauthorized view (no token)
    await page.goto("/display/rooms/room-a");
    await expect(page.getByText(/Pairing Token Required/i)).toBeVisible();
  });
});
