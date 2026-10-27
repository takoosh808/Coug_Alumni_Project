"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export default function FilterCombobox({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[];
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(-1);
  const matches = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase()),
  );
  const choices = [
    { value: "", label: "Any answer" },
    ...matches.map((option) => ({ value: option, label: option })),
  ];

  useEffect(() => {
    if (open && active >= 0)
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function showAll() {
    setSearch("");
    setActive(-1);
    setOpen(true);
  }

  function choose(next: string) {
    setValue(next);
    setSearch("");
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setSearch("");
        setOpen(true);
        setActive(event.key === "ArrowDown" ? 0 : options.length);
      } else {
        setActive((index) =>
          event.key === "ArrowDown"
            ? (index + 1) % choices.length
            : index <= 0
              ? choices.length - 1
              : index - 1,
        );
      }
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      choose(choices[active].value);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Tab" || event.key === "Enter") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div
      className="filter-choice"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="filter-choice-input">
        <input
          ref={input}
          id={id}
          name={name}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && active >= 0 ? `${id}-option-${active}` : undefined
          }
          placeholder="Any / type to search…"
          autoComplete="off"
          onFocus={showAll}
          onClick={showAll}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            setValue(event.target.value);
            setSearch(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
        />
        <button
          type="button"
          className="filter-choice-toggle"
          aria-label={`Show all choices for ${label}`}
          aria-expanded={open}
          aria-controls={`${id}-options`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open && !search) setOpen(false);
            else {
              input.current?.focus();
              showAll();
            }
          }}
        >
          <span aria-hidden="true">⌄</span>
        </button>
      </div>
      {open ? (
        <div className="filter-choice-menu">
          <ul
            ref={list}
            id={`${id}-options`}
            role="listbox"
            aria-label={`${label} choices`}
          >
            {choices.map((choice, index) => (
              <li
                key={choice.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={value === choice.value}
                className={active === index ? "is-active" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(choice.value)}
              >
                {choice.label}
                {value === choice.value ? (
                  <span aria-hidden="true">✓</span>
                ) : null}
              </li>
            ))}
          </ul>
          {search && !matches.length ? (
            <p>No suggestions match. You can still search with your text.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
