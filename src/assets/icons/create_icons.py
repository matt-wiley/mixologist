#!/usr/bin/env python3
"""
Quick script to create basic PNG icons for the extension
"""

try:
    from PIL import Image, ImageDraw
    
    # Create simple audio mixer icon
    sizes = [16, 32, 48, 128]
    
    for size in sizes:
        # Create a simple audio/mixer icon
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Draw a simple speaker/volume icon
        margin = max(2, size // 8)
        
        # Speaker box
        box_width = size // 3
        box_height = size // 2
        box_x = margin
        box_y = (size - box_height) // 2
        
        draw.rectangle([box_x, box_y, box_x + box_width, box_y + box_height], 
                      fill=(64, 128, 255, 255), outline=(32, 64, 128, 255))
        
        # Sound waves
        wave_x = box_x + box_width + margin
        center_y = size // 2
        
        # Three curved lines for sound waves
        for i in range(3):
            radius = (i + 1) * (size // 8)
            if wave_x + radius < size - margin:
                draw.arc([wave_x - radius, center_y - radius, 
                         wave_x + radius, center_y + radius], 
                        -30, 30, fill=(64, 128, 255, 255), width=max(1, size // 32))
        
        img.save(f'icon-{size}.png')
        print(f"Created icon-{size}.png")
        
except ImportError:
    print("PIL not available, creating simple text files as placeholders")
    for size in [16, 32, 48, 128]:
        with open(f'icon-{size}.png', 'w') as f:
            f.write(f'# Placeholder icon {size}x{size}\n')