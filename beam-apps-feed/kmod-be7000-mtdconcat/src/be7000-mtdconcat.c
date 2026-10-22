// SPDX-License-Identifier: GPL-2.0-only
/*
 * Glue MTD partitions into one MTD device, so that one UBI device can span
 * them. The Xiaomi BE7000 uses it to put /overlay on the spare firmware slot
 * and the data partition together:
 *
 *   insmod be7000-mtdconcat parts=rootfs_1,overlay name=be7000_concat
 *
 * The partitions come from the SMEM partition table and have no device tree
 * nodes, so the "mtd-concat" device tree binding cannot name them. This
 * looks them up by name instead. All of them must be on the same chip (same
 * erase, write and OOB size), which mtd_concat_create() checks.
 */

#include <linux/err.h>
#include <linux/module.h>
#include <linux/mtd/concat.h>
#include <linux/mtd/mtd.h>
#include <linux/slab.h>
#include <linux/string.h>

#define MAX_PARTS 4

static char *parts;
module_param(parts, charp, 0444);
MODULE_PARM_DESC(parts, "MTD partition names to glue, comma separated, in order");

static char *name = "be7000_concat";
module_param(name, charp, 0444);
MODULE_PARM_DESC(name, "name of the new MTD device");

static struct mtd_info *subdev[MAX_PARTS];
static int nsub;
static struct mtd_info *concat;

static void put_parts(void)
{
	while (nsub)
		put_mtd_device(subdev[--nsub]);
}

static int __init be7000_mtdconcat_init(void)
{
	char *buf, *p, *tok;
	int err;

	if (!parts || !*parts)
		return -EINVAL;

	buf = kstrdup(parts, GFP_KERNEL);
	if (!buf)
		return -ENOMEM;

	p = buf;
	while ((tok = strsep(&p, ",")) != NULL) {
		struct mtd_info *mtd;

		if (!*tok)
			continue;
		if (nsub == MAX_PARTS) {
			err = -E2BIG;
			goto fail;
		}
		mtd = get_mtd_device_nm(tok);
		if (IS_ERR(mtd)) {
			pr_err("be7000-mtdconcat: no MTD device \"%s\"\n", tok);
			err = PTR_ERR(mtd);
			goto fail;
		}
		subdev[nsub++] = mtd;
	}

	if (nsub < 2) {
		err = -EINVAL;
		goto fail;
	}

	concat = mtd_concat_create(subdev, nsub, name);
	if (!concat) {
		err = -EINVAL;
		goto fail;
	}

	err = mtd_device_register(concat, NULL, 0);
	if (err) {
		mtd_concat_destroy(concat);
		concat = NULL;
		goto fail;
	}

	pr_info("be7000-mtdconcat: %s is %s, %llu bytes\n", name, parts,
		(unsigned long long)concat->size);
	kfree(buf);
	return 0;

fail:
	put_parts();
	kfree(buf);
	return err;
}

static void __exit be7000_mtdconcat_exit(void)
{
	if (concat) {
		mtd_device_unregister(concat);
		mtd_concat_destroy(concat);
		concat = NULL;
	}
	put_parts();
}

module_init(be7000_mtdconcat_init);
module_exit(be7000_mtdconcat_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Timofey Maykov <itnitro@gmail.com>");
MODULE_DESCRIPTION("Glue MTD partitions into one device by name");
