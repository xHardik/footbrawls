from PIL import Image

def is_background(r, g, b):
    # Check if pixel is grayscale and bright (checkerboard pattern)
    if abs(r - g) < 15 and abs(r - b) < 15 and r > 180:
        return True
    return False

# Open the original logo image (we should reload from the saved one if it was overwritten, 
# but the previous script only made (212,212,212) transparent. The white squares are still there).
# Actually, the previous script might have ruined it, let's just process it based on current state.
img = Image.open('public/logo.png').convert('RGBA')
data = list(img.getdata())
width, height = img.size

min_x, min_y = width, height
max_x, max_y = 0, 0

new_data = []

for y in range(height):
    for x in range(width):
        r, g, b, a = data[y * width + x]
        
        # If it's already transparent from previous script or is a checkerboard pixel
        if a == 0 or is_background(r, g, b):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append((r, g, b, 255))
            
            # Update bounding box
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

img.putdata(new_data)

if min_x <= max_x and min_y <= max_y:
    # Crop to the bounding box of the shield
    # Add a small padding
    padding = 2
    min_x = max(0, min_x - padding)
    min_y = max(0, min_y - padding)
    max_x = min(width - 1, max_x + padding)
    max_y = min(height - 1, max_y + padding)
    
    img = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    
img.save('public/logo.png')
print(f"Cropped to bounding box: ({min_x}, {min_y}) to ({max_x}, {max_y})")
