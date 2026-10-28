import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("Admin Interactive Spandi Layout Editor", () => {
  test("loads editor, displays canvas & elements palette, modifies layout and opens usher print modal", async ({ page }) => {
    await login(page, "admin");

    // 1. Navigate to Rooms management
    await page.goto("/admin/rooms");
    await expect(page.getByRole("heading", { name: "Rooms & Facilities", level: 1 })).toBeVisible();

    // 2. Click layout editor action on the first room (Room A)
    const layoutBtn = page.getByRole("link", { name: /Layout Editor Room A/i });
    await expect(layoutBtn).toBeVisible();
    await layoutBtn.click();

    // 3. Verify editor loads with Room A dimensions and palette
    await expect(page.getByRole("heading", { name: /Room A/i })).toBeVisible();
    await expect(page.getByText("Element Palette")).toBeVisible();
    await expect(page.getByText("Room Capacity")).toBeVisible();

    // 4. Test Element Palette: Click to add an element (Pulpit / Podium)
    await page.getByRole("button", { name: /Pulpit \/ Podium/i }).click();
    await expect(page.getByText("Added Pulpit / Podium")).toBeVisible();

    // 5. Verify Item Settings panel updates for the newly added item
    await expect(page.getByText("Item Settings")).toBeVisible();
    await expect(page.getByText("Rotation", { exact: true })).toBeVisible();

    // 6. Test rotation button (click 90°)
    await page.getByRole("button", { name: "90°" }).click();

    // 7. Test Presets modal
    await page.getByRole("button", { name: "Presets & Templates" }).click();
    await expect(page.getByRole("heading", { name: "Seating Presets & Templates" })).toBeVisible();
    await expect(page.getByText("Sunday Worship (Theater Rows)")).toBeVisible();
    await expect(page.getByText("Leadership Workshop (Classroom)")).toBeVisible();

    // Apply Classroom preset
    const applyButtons = page.getByRole("button", { name: "Apply Preset" });
    await applyButtons.nth(1).click();
    await expect(page.getByText(/Loaded preset/i)).toBeVisible();

    // 8. Test Usher Sheet modal
    await page.getByRole("button", { name: "Usher Sheet" }).click();
    await expect(page.getByRole("heading", { name: /Usher & Volunteer Floor Plan Sheet/i })).toBeVisible();
    await expect(page.getByText(/Inventory Checklist/i)).toBeVisible();
    await expect(page.getByText(/Usher & Security Notes/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Print Sheet" })).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");

    // 9. Save Layout
    await page.getByRole("button", { name: "Save Layout" }).click();
    await expect(page.getByText(/Saved layout for Room A!/i)).toBeVisible();
  });
});
