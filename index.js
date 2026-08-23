/* eslint-disable no-param-reassign, no-nested-ternary */

String.prototype.clr = function(p1) {
	return `<font color='#${p1}'>${this}</font>`;
};

module.exports = function ff(mod) {
	const _m = {
		"h": [],
		"b": [],
		"x": [],
		"u1": 999999999,
		"u2": 899999999
	};

	function vec(p) {
		return { "x": p.x, "y": p.y, "z": p.z };
	}

	function locTime() {
		return _m.p.time - _m.t + Date.now() - 50;
	}

	function instantMove(loc, w) {
		if (!_m.p || !loc) return;
		mod.send("C_PLAYER_LOCATION", 5, { ..._m.p, "loc": loc, "w": w, "dest": loc, "type": 7, "time": locTime() });
		mod.send("S_INSTANT_MOVE", 3, { "gameId": mod.game.me.gameId, "loc": loc, "w": w });
	}

	// Keep blinks on the same floor. Mob Z is only used when it is close to yours.
	function floorZ(targetZ, playerZ) {
		if (targetZ == null || Math.abs(targetZ - playerZ) > 80) return playerZ;
		return targetZ;
	}

	function dist2(a, b) {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function stopGuard() {
		if (_m.gt) {
			mod.clearTimeout(_m.gt);
			_m.gt = null;
		}
		_m.guard = false;
	}

	function armGuard(origin, dest, w) {
		stopGuard();
		_m.guard = true;
		_m.from = { "loc": vec(origin), "w": w };
		_m.to = vec(dest);
		_m.gt = mod.setTimeout(() => {
			_m.guard = false;
			_m.gt = null;
		}, 1500);
	}

	function isVoid(loc) {
		if (!_m.from) return false;
		const dz = loc.z - _m.from.loc.z;
		if (dz < -220 || dz > 280) return true;
		if (dz < -100 && _m.to && dist2(loc, _m.to) < 150) return true;
		return false;
	}

	function pullBack() {
		if (!_m.from) return;
		stopGuard();
		_m.lock = Date.now() + 500;
		instantMove(_m.from.loc, _m.from.w);
		mod.command.message("Jaunt reverted (unsafe landing).".clr("FF0202"));
	}

	function lastSafeLoc() {
		if (_m.safe && _m.safe.loc) return _m.safe;
		if (_m.from) return _m.from;
		if (_m.s) return { "loc": _m.s, "w": 0 };
		return null;
	}

	mod.hook("S_LOGIN", mod.majorPatchVersion >= 114 ? 15 : 14, ({ templateId }) => {
		_m.m = [1, 10].includes(_m.i = (templateId - 10101) % 100) ? 1 : [6, 7].includes(_m.i) ? 0 : -1;
		_m.g = [{ "gameId": mod.game.me.gameId }];

		if (mod.settings.enable) {
			load();
		}
	});

	mod.game.on("leave_game", () => {
		stopGuard();
		_m.safe = _m.from = _m.to = null;
		unload();
	});

	mod.command.add(["jaunt"], (p1, p2, p3) => {
		switch (p1 ? p1 = p1.toLowerCase() : p1) {
			case undefined:
				if ((mod.settings.enable = !mod.settings.enable) === true) {
					load();
				} else {
					unload();
				}
				return mod.command.message(`Module ${mod.settings.enable ? "enabled".clr("15FF02") : "disabled".clr("FF0202")}.`);
			case "on":
				if (mod.settings.enable) {
					return mod.command.message("Module is already enabled.".clr("FF0202"));
				}
				load();
				return mod.command.message(`Module ${(mod.settings.enable = !mod.settings.enable) === true ? "enabled.".clr("15FF02") : ""}`);
			case "off":
				if (!mod.settings.enable) {
					return mod.command.message("Module is already disabled.".clr("FF0202"));
				}
				unload();
				return mod.command.message(`Module ${(mod.settings.enable = !mod.settings.enable) === false ? "disabled.".clr("FF0202") : ""}`);
			case "debug":
				if (p2) {
					switch (p2) {
						case "i":
							return mod.command.message(`Debug: _m.i = ${_m.i = p3}`);
						case "m":
							return mod.command.message(`Debug: _m.m = ${_m.m = p3}`);
					}
				}
				return mod.command.message(`Module debugging ${(mod.settings.debug = !mod.settings.debug) === true ? "enabled.".clr("15FF02") : "disabled.".clr("FF0202")}`);
			case "unstuck": {
				const safe = lastSafeLoc();
				if (!safe) return mod.command.message("No safe position yet.".clr("FF0202"));
				stopGuard();
				instantMove(safe.loc, safe.w || 0);
				return;
			}
			default:
				if (!p2) {
					return mod.command.message("No parameter.".clr("FF0202"));
				} else if (isNaN(p2)) {
					return mod.command.message(`${p2} is an invalid parameter.`.clr("FF0202"));
				}

				switch (p1) {
					case "range":
						mod.settings.range = parseInt(p2);
						if (mod.settings.range < 0) {
							mod.command.message(`Range out of bounds, defaulted to ${mod.settings.range = 35}m.`.clr("FF0202"));
						} else {
							mod.command.message(`Range set to ${mod.settings.range}m.`);
						}
						break;
					case "angle":
						mod.settings.angle = parseFloat(p2);
						if (mod.settings.angle < 0.0872665 || mod.settings.angle > 6.28318) {
							mod.command.message(`Angle out of bounds, defaulted to 15°(${mod.settings.angle = 0.261799}).`.clr("FF0202"));
						} else {
							mod.command.message(`Angle set to ${mod.settings.angle}.`);
						}
						break;
					case "distance":
						mod.settings.distance = parseInt(p2);
						if (mod.settings.distance < 100 || mod.settings.distance > 350) {
							mod.command.message(`Distance out of bounds, defaulted to ${mod.settings.distance = 200}.`.clr("FF0202"));
						} else {
							mod.command.message(`Distance set to ${mod.settings.distance}.`);
						}
						break;
					case "direction":
						mod.settings.direction = parseInt(p2);
						if (![-1, 1].includes(mod.settings.direction)) {
							mod.command.message(`Direction out of bounds, defaulted to backwards(${mod.settings.direction = -1}).`.clr("FF0202"));
						} else {
							mod.command.message(`Direction set to ${mod.settings.direction}.`);
						}
						break;
					case "cooldown":
						mod.settings.cooldown = parseInt(p2);
						if (mod.settings.cooldown < 500) {
							mod.command.message(`Cooldown out of bounds, defaulted to ${mod.settings.cooldown = 3500}ms.`.clr("FF0202"));
						} else {
							mod.command.message(`Cooldown set to ${mod.settings.cooldown}.`);
						}
						break;
					default:
						return mod.command.message(`${p1} is an invalid parameter.`.clr("FF0202"));
				}
		}
	});

	function load() {
		function hook() {
			_m.h.push(mod.hook(...arguments));
		}

		function update(p1, p2, p3) {
			for (const i in _m.b) {
				if (_m.b[i].gameId === p1) {
					_m.b[i].loc = p3;
					_m.b[i].w = p2;
				}
			}
		}

		hook("S_SPAWN_NPC", 11, { "order": 300, "filter": { "fake": null } }, ({ gameId, loc, w, templateId, visible, villager, bySpawnEvent, bgTeam }) => {
			if (!visible || villager || bySpawnEvent || bgTeam || [1044, 1045, 1151, 1270, 1709, 1710, 1711, 1712, 5003, 5004, 9996, 9997, 9998, 2041, 2042, 2043, 2100, 4101].includes(templateId)) return;

			_m.b.push({ gameId, loc, w });
			if (mod.settings.debug) {
				mod.log(
					"\nS_SPAWN_NPC:" +
					`\ntemplateId = ${templateId}`
				);
			}
		});

		hook("S_USER_EFFECT", 1, { "order": 300, "filter": { "fake": null } }, ({ target, source }) => {
			if (_m.g.some(e => e.gameId === target) && !_m.b.some(e => e.gameId === source)) {
				_m.b.push({ "gameId": source });
			}
		});

		hook("S_NPC_LOCATION", 3, { "order": 300, "filter": { "fake": null } }, ({ gameId, w, dest }) => {
			if (_m.b.some(e => e.gameId === gameId)) {
				update(gameId, w, dest);

				if (mod.settings.debug) {
					if ((_m.a1 = _m.a1 || dest) !== dest && (_m.d = Math.floor(((dest.x - _m.p.loc.x) ** 2 + (dest.y - _m.p.loc.y) ** 2) ** 0.5 / 25)) < 35) {
						mod.send("S_DESPAWN_DROPITEM", 4, { "gameId": _m.u2 });
						mod.send("S_SPAWN_DROPITEM", 9, { "gameId": --_m.u2, "loc": { ...dest, "z": dest.z - 500 }, "item": 98260, "amount": 1, "expiry": 0, "explode": false, "masterwork": false, "enchant": 0, "source": 0, "debug": false, "owners": [{ "id": 0 }] });
					}
				}
			}
		});

		hook("S_ACTION_STAGE", 9, { "order": 300, "filter": { "fake": null } }, ({ gameId, w, loc }) => {
			if (_m.b.some(e => e.gameId === gameId)) {
				update(gameId, w, loc);

				if (mod.settings.debug) {
					if ((_m.a2 = _m.a2 || loc) !== loc && (_m.d = Math.floor(((loc.x - _m.p.loc.x) ** 2 + (loc.y - _m.p.loc.y) ** 2) ** 0.5 / 25)) < 35) {
						mod.send("S_DESPAWN_DROPITEM", 4, { "gameId": _m.u2 });
						mod.send("S_SPAWN_DROPITEM", 9, { "gameId": --_m.u2, "loc": { ...loc, "z": loc.z - 500 }, "item": 98260, "amount": 1, "expiry": 0, "explode": false, "masterwork": false, "enchant": 0, "source": 0, "debug": false, "owners": [{ "id": 0 }] });
					}
				}
			}
		});

		hook("S_ACTION_END", 5, { "order": 300, "filter": { "fake": null } }, ({ gameId, w, loc }) => {
			if (_m.b.some(e => e.gameId === gameId)) {
				update(gameId, w, loc);

				if (mod.settings.debug) {
					if ((_m.a3 = _m.a3 || loc) !== loc && (_m.d = Math.floor(((loc.x - _m.p.loc.x) ** 2 + (loc.y - _m.p.loc.y) ** 2) ** 0.5 / 25)) < 35) {
						mod.send("S_DESPAWN_DROPITEM", 4, { "gameId": _m.u2 });
						mod.send("S_SPAWN_DROPITEM", 9, { "gameId": --_m.u2, "loc": { ...loc, "z": loc.z - 500 }, "item": 98260, "amount": 1, "expiry": 0, "explode": false, "masterwork": false, "enchant": 0, "source": 0, "debug": false, "owners": [{ "id": 0 }] });
					}
				}
			}
		});

		hook("S_DESPAWN_NPC", 3, { "order": 300, "filter": { "fake": null } }, ({ gameId }) => {
			for (const i in _m.b) {
				if (_m.b[i].gameId === gameId) {
					_m.b.splice(i, 1);
				}
			}
		});

		hook("C_START_INSTANCE_SKILL", mod.majorPatchVersion >= 114 ? 8 : 7, { "order": -100 }, ({ skill, loc, w, targets }) => {
			if (skill.id !== mod.settings.skill || (!mod.game.me.inOpenWorld && !mod.game.me.inCombat && targets[0])) return;

			Object.assign(skill, { "type": 0, "npc": false, "huntingZoneId": 0, "reserved": 0 });
			mod.send("S_CANNOT_START_SKILL", 4, { skill });

			if (_m.z) {
				if (!_m.x[2]) {
					_m.x.push("!");

					(function(p1, p2) {
						return () => {
							if (mod.settings.debug) {
								mod.send("S_DESPAWN_DROPITEM", 4, { "gameId": _m.u1 });
								mod.send("S_SPAWN_DROPITEM", 9, { "gameId": --_m.u1, "loc": Object.assign(p1[0], { "z": p1[0].z - 500 }), "item": 98260, "amount": 1, "expiry": 0, "explode": false, "masterwork": false, "enchant": 0, "source": 0, "debug": false, "owners": [{ "id": 0 }] });
								setTimeout(
									(function(p11) {
										return () => mod.send("S_DESPAWN_DROPITEM", 4, { "gameId": p11 });
									}(_m.u1)), mod.settings.cooldown - (Date.now() - p1[1]) + 50);
							} else {
								mod.send("C_PLAYER_LOCATION", 5, { ..._m.p, "loc": p1[0], "w": p2, "dest": p1[0], "type": 7, "time": _m.p.time - _m.t + Date.now() - 50 });
								mod.send("S_INSTANT_MOVE", 3, { "gameId": mod.game.me.gameId, "loc": p1[0], "w": p2 });
								setTimeout(() => {
									if ((p1[0] && p1[0].z - _m.p.loc.z) > 100) {
										mod.send("C_PLAYER_LOCATION", 5, { ..._m.p, "loc": Object.assign(p1[0], { "z": p1[0].z + 100 }), "w": p2, "dest": p1[0], "type": 7, "time": _m.p.time - _m.t + Date.now() - 50 });
										mod.send("S_INSTANT_MOVE", 3, { "gameId": mod.game.me.gameId, "loc": p1[0], "w": p2 });
									}
								}, 100);
							}
							mod.send("S_ABNORMALITY_END", 1, { "target": mod.game.me.gameId, "id": 2060 });
						};
					}(_m.x, _m.w));
				} else {
					mod.command.message("Wait a moment before using this skill again.".clr("FF0202"));
				}
				return false;
			}

			if (_m.m) {
				for (const i of _m.b) {
					if (i.loc && (_m.d = Math.floor(((i.loc.x - loc.x) ** 2 + (i.loc.y - loc.y) ** 2) ** 0.5 / 25)) < mod.settings.range) {
						_m.x = _m.x.length ? _m.x[0] < _m.d ? _m.x : [_m.d, i.loc, i.w] : [_m.d, i.loc, i.w];
					}
				}
			}

			if (!_m.x.length || (Math.abs(Math.atan2(_m.x[1].y - loc.y, _m.x[1].x - loc.x) - w) > mod.settings.angle) || ((_m.m === 1) && (_m.x[0] <= 15) && ((Math.abs(Math.atan2(loc.y - _m.x[1].y, loc.x - _m.x[1].x) - _m.x[2]) >= 3.14159 ? 6.28319 - Math.abs(Math.atan2(loc.y - _m.x[1].y, loc.x - _m.x[1].x) - _m.x[2]) : Math.abs(Math.atan2(loc.y - _m.x[1].y, loc.x - _m.x[1].x) - _m.x[2])) <= 0.174533))) {
				_m.z = { "x": loc.x + mod.settings.direction * (mod.settings.distance * Math.cos(w) * 2), "y": loc.y + mod.settings.direction * (mod.settings.distance * Math.sin(w) * 2), "z": loc.z };
				_m.w = w;
			} else {
				_m.z = { "x": _m.x[1].x + _m.m * (mod.settings.distance * Math.cos(_m.x[2])), "y": _m.x[1].y + _m.m * (mod.settings.distance * Math.sin(_m.x[2])), "z": floorZ(_m.x[1].z, loc.z) };
				_m.w = Math.atan2(_m.x[1].y - _m.z.y, _m.x[1].x - _m.z.x);
			}

			if (mod.settings.debug) {
				if (!_m.x.length) {
					mod.command.message(`\n\t${ `${_m.x.length}`.clr("FF1493")}`);
				} else {
					const f1 = (p1) => `${Math.round(p1 * 180 / 3.14159)}°`,
						v1 = Math.abs(Math.atan2(_m.x[1].y - loc.y, _m.x[1].x - loc.x) - w),	// player angle to mob
						v2 = Math.abs(Math.atan2(loc.y - _m.x[1].y, loc.x - _m.x[1].x) - _m.x[2]),	// mob angle to player
						v3 = v2 >= 3.14159 ? 6.28319 - v2 : v2;	// mob angle adjustment

					mod.log(`\n\n_m.x[0] = ${_m.x[0]}\n_m.x[1] = { x: ${_m.x[1].x}, y: ${_m.x[1].y}, z: ${_m.x[1].z} }\n_m.x[2] = ${_m.x[2]}\n\nloc = { x: ${loc.x}, y: ${loc.y}, z: ${loc.z} }\nw = ${w}\n`);
					mod.command.message(`\n\t${ f1(v1).clr(_m.w === w ? "FF1493" : "FFD700") }\n\t${ f1(v3).clr(_m.w === w ? "FF1493" : "FFD700") }${v2 >= 3.14159 ? `${" (" + "360° - "}${ f1(v2) })` : "" }\n\t${ `${_m.x[0]}m`.clr(_m.w === w ? "FF1493" : "FFD700")}`);
				}

				mod.send("S_SPAWN_DROPITEM", 9, { "gameId": --_m.u1, "loc": { "x": _m.z.x, "y": _m.z.y, "z": _m.z.z - 500 }, "item": 98260, "amount": 1, "expiry": 0, "explode": false, "masterwork": false, "enchant": 0, "source": 0, "debug": false, "owners": [{ "id": 0 }] });
				setTimeout(
					(function(p1) {
						return () => mod.send("S_DESPAWN_DROPITEM", 4, { "gameId": p1 });
					}(_m.u1)), mod.settings.cooldown);
			} else {
				const origin = vec(loc);
				const originW = w;
				setTimeout(() => {
					instantMove(_m.z, _m.w);
					armGuard(origin, _m.z, originW);
				}, 50);
			}
			_m.x = [loc, Date.now()];

			mod.send("S_ABNORMALITY_BEGIN", mod.majorPatchVersion >= 107 ? 5 : 4, { "target": mod.game.me.gameId, "source": mod.game.me.gameId, "id": 2112, "duration": 0, "unk": 0, "stacks": 1, "unk2": 0, "unk3": 0 });
			mod.send("S_ABNORMALITY_BEGIN", mod.majorPatchVersion >= 107 ? 5 : 4, { "target": mod.game.me.gameId, "source": mod.game.me.gameId, "id": 2060, "duration": 0, "unk": 0, "stacks": 1, "unk2": 0, "unk3": 0 });
			setTimeout(() => {
				mod.send("S_ABNORMALITY_END", 1, { "target": mod.game.me.gameId, "id": 2112 });
				mod.send("S_ABNORMALITY_END", 1, { "target": mod.game.me.gameId, "id": 2060 });

				_m.z = _m.w = _m.x.length = 0;
			}, mod.settings.cooldown);

			return false;
		});
	}

	mod.hook("C_PLAYER_LOCATION", 5, (event) => {
		_m.p = event;
		_m.t = Date.now();

		if (_m.lock && Date.now() < _m.lock) {
			if (_m.from && isVoid(event.loc)) instantMove(_m.from.loc, _m.from.w);
			return;
		}

		if (_m.guard && isVoid(event.loc)) {
			pullBack();
			return;
		}

		if (!_m.guard && event.type !== 7) {
			if (!(_m.safe && event.loc.z - _m.safe.loc.z < -80)) {
				_m.safe = { "loc": vec(event.loc), "w": event.w };
			}
		}
	});

	mod.hook("S_LOAD_TOPO", 3, { "order": 100 }, ({ loc }) => {
		_m.s = loc;
		_m.safe = { "loc": vec(loc), "w": 0 };
		stopGuard();
	});

	mod.hook("S_PARTY_MEMBER_LIST", mod.majorPatchVersion >= 106 ? 9 : 8, ({ members }) => {
		_m.g = members;

		if (_m.i === 0 && !_m.g.some(e => [1, 10].includes((e.class - 10101) % 100))) {
			if (_m.g.some(e => [0].includes((e.class - 10101) % 100))) {
				mod.command.add(["itank"], () => {
					_m.m = 1;
				});
				setTimeout(() => {
					mod.command.remove(["itank"]);
				}, 30000);
			}
		}

		if (mod.settings.debug) {
			mod.log(typeof members);
		}
		for (const [k, v] of Object.entries(members)) {
			if (mod.settings.debug) {
				mod.log(`${k }:${ v}`);
			}
			if (!_m.g.some(e => e.gameId === v)) {
				_m.g.push({ [v]: v.class });
			}
		}

		const h = mod.hook("S_LEAVE_PARTY", 1, () => {
			_m.g = [{ "gameId": mod.game.me.gameId }];
			_m.m = _m.i === 0 ? -1 : _m.m;

			mod.unhook(h);
		});
	});

	function unload() {
		if (_m.h.length) {
			for (const i of _m.h) {
				mod.unhook(i);
			}
			_m.h.length = 0;
		}
	}

	this.destructor = () => {
		stopGuard();
		mod.command.remove(["jaunt"]);
	};
};
