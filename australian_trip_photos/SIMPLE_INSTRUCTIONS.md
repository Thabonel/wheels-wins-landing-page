# Fix Photos - Simple Steps

## 🔍 **FIRST: Find the problem**
1. Run `DEBUG_find_exact_templates.sql`
2. This will show you exactly which templates exist and what photos they have

## 🧹 **OPTION 1: Nuclear Clear (Recommended)**
1. Run `NUCLEAR_CLEAR_ALL.sql` - removes ALL photos from ALL templates
2. Then manually add photos back to only the templates you want

## 🎯 **OPTION 2: Targeted Fix**
1. Use the results from DEBUG to update `TARGETED_FIX.sql` with exact IDs
2. Run the targeted fix

## 💡 **Why it's not working:**
- Template names might be slightly different than expected
- There might be duplicate templates with same names
- Previous updates didn't target the right templates

**Start with DEBUG_find_exact_templates.sql to see what's actually in your database!**