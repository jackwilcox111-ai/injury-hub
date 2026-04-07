-- Re-trigger lien sync for the denied charge so existing data recalculates
UPDATE charges SET status = status WHERE id = 'a500963c-6dc9-49d2-9d07-104abf1597b1';