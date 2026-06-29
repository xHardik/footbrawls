from PIL import Image

# Open the logo image
img = Image.open('public/logo.png').convert('RGBA')
data = img.getdata()

new_data = []
# Background is roughly (212, 212, 212)
bg_color = (212, 212, 212)
tolerance = 40 # tolerance for anti-aliasing around the edge

for item in data:
    # item is (r, g, b, a)
    # Calculate distance from bg_color
    diff = abs(item[0] - bg_color[0]) + abs(item[1] - bg_color[1]) + abs(item[2] - bg_color[2])
    
    if diff < tolerance:
        # If it's very close to bg, make it fully transparent
        new_data.append((255, 255, 255, 0))
    elif diff < tolerance + 30:
        # Soft transition for edges (anti-aliasing)
        alpha = int(((diff - tolerance) / 30.0) * 255)
        new_data.append((item[0], item[1], item[2], alpha))
    else:
        new_data.append(item)

img.putdata(new_data)
img.save('public/logo.png')
print("Shield cutout applied successfully!")
